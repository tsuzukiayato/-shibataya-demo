# OZ STAFF SYSTEM — DB Schema v1

2026-10-04 / PostgreSQL第一案 / **レビュー用モデル。DDL・マイグレーションは実行しない。**

## 1. 基本原則

正本は院内中央DB。APIだけが接続する。内部IDはUUID、患者番号は先頭ゼロを失わない文字列。名前を関連キーにしない。業務日はdate、枠開始はtime、操作や実施の瞬間はtimestamptzで保持し、標準表示はAsia/Tokyo。更新可能な業務行には明示的なversion bigintを持つ。履歴は追記のみ、マスターは削除より無効化を優先する。

枠状態を複数テーブルへ複製せず、Shift＋DayOverride＋SlotOverrideから導出する。予約と実績を分離し、取消でも関連する業務記録を消さない。これはモデル案であり、実DBの制約・交換・負荷試験は今後行う。

## 2. モデル関係

| 関係 | 多重度と意味 |
|---|---|
| Patient → Reservation | 1対多、取消も保持 |
| Staff → ScheduleResource | 資源側の任意参照。人以外の表示行を許す |
| ScheduleResource → Shift | 資源×勤務日で最大1行 |
| ScheduleResource → ReservationSlot | 資源×日付×開始時刻で1行 |
| ReservationSlot → SlotOverride | 最大1行。解除の履歴は監査に残す |
| ReservationSlot → Reservation | 過去を含め多。現在占有は最大1件 |
| Patient → Visit | 1対多。同日再来院も許容するモデル |
| Reservation → Visit | 任意関連。運用上の上限は確認後に制約 |
| Visit → Actual | 1対多。予約なし来院・複数実施を表現 |
| Reservation/Actual → Event | 1対多。業務の変更前後を保持 |
| 業務更新 → AuditLog/Outbox | 同一トランザクション内で保存 |

## 3. Patient

| 列 | 型・条件 | 用途 |
|---|---|---|
| id | uuid PK | 不変ID |
| patient_number | text NOT NULL UNIQUE | 患者番号 |
| name | text NOT NULL | 氏名 |
| kana | text NULL | 現原本未提供。空値を許可 |
| normalized_name / normalized_kana | text、カナはNULL可 | 氏名検索用。現仕様の空白除去を継承 |
| default_category_code | text NULL | 患者区分。予約区分と別 |
| is_active | boolean NOT NULL | 新規検索/予約対象の有効性 |
| version | bigint NOT NULL | 更新競合検出 |
| created_at / updated_at | timestamptz NOT NULL | サーバー日時 |

数字検索は `patient_number = 入力文字列`。LIKE部分一致にしない。全角番号の扱い、先頭ゼロが同一番号かは本番番号体系を確認してから確定する。現在の1/100/200/10046が各1件になることを保護する。

番号一意B-treeを使用。名前は2万件・結果上限100件で測定し、必要なら検索索引を追加する。空検索で全患者を返したり、全件DOM描画したりしない。

## 4. Staff / ScheduleResource

| Entity | 主要列 | 制約・意味 |
|---|---|---|
| Staff | id uuid PK、staff_code text UNIQUE、display_name text、active_from/to date、is_active、version | 実際の職員。ログインUserとは別 |
| ScheduleResource | id uuid PK、resource_code text UNIQUE、display_name、display_order int、kind、staff_id uuid NULL FK、active_from/to、version | 予約表の行/列。kindはstaff/location/therapy/undetermined候補 |

現順序：本院→山口→竹谷→赤尾→中西→釆野→増田→都築→伊藤→長谷川→山梨→松田。名称変更でもID不変。「本院」が職員か場所か未確認なのでstaff_idを強制しない。

v1は1資源1枠1予約。物療の同時定員、複数担当、複数枠予約は未確定であり、capacityを増やして300件に合わせない。将来の複数枠予約はReservationと枠の割当を別モデルへ拡張する変更として検討する。

## 5. Shift / DayOverride

| Entity | 主要列 | 制約 |
|---|---|---|
| Shift | id PK、resource_id FK、work_date date、code text、version、updated_by FK、updated_at | UNIQUE(resource_id, work_date) |
| DayOverride | id PK、resource_id FK、work_date date、code text、reason、version、updated_by、updated_at | UNIQUE(resource_id, work_date)。旧D.override移行先 |

勤務コード：normal/full/amoff/pmoff/730/715/700/600、および既存phys/physam/physpmを保持。円形メニューは指定8項目に限定し、物療系の選択肢を勝手に増やさない。

fullは全時間閉鎖、amoffは午前閉鎖、pmoffは午後閉鎖、600は18:00以降閉鎖。730/715/700は表示コード。未入力のShift行なしと明示normalを保存上区別し、画面は現仕様どおり通常を示す。

SetShiftで当該DayOverrideを解除する現操作を継承する。前後を監査に記録し、SlotOverrideは解除しない。二重管理を整理する場合は別承認とする。

## 6. ReservationSlot / SlotOverride / DayGuard

| Entity | 主要列 | 制約・方針 |
|---|---|---|
| ReservationSlot | id PK、resource_id FK、service_date date、start_time time、duration_minutes smallint、version | UNIQUE(resource_id, service_date, start_time)、v1 duration=20 |
| SlotOverride | id PK、slot_id UNIQUE FK、state text、reason、version、updated_by、updated_at | normal/phys/closed。解除で現行行を削除、監査履歴は保持 |
| DayGuard | resource_id FK、service_date date、revision bigint | 複合PK。同じ日付/資源の業務変更を直列化 |

全未来枠を事前保存せず、表示時に時間テンプレートから導出する。操作対象枠は自然キーのUPSERTで識別行を確保する。未作成枠へは日付/資源/時刻をAPIへ送り、サーバーがIDを解決する。

空き枠にもDayGuardを確保してロックできる構造にする。予約行のない空き状態でも同時予約を制御する。状態はSlotOverride＞DayOverride＞Shiftで算出する。

**現book()は通常予約でもnormal上書きを保存する。** 移行時は原値を保持し、上書き印で判別可能にする。後日のシフト休みより上書きが優先する挙動を勝手に変えない。

現AM10＋PM13開始枠を保持。12:00/19:00も開始枠として残す。20分なら終了は12:20/19:20だが、診療終端との整合はレビュー対象。

## 7. Reservation / ReservationEvent

| 列 | 型・条件 | 意味 |
|---|---|---|
| id | uuid PK | 移動しても同一予約ID |
| patient_id | uuid FK NOT NULL | 患者 |
| slot_id | uuid FK NOT NULL | 現在、または取消時点の枠 |
| status | text NOT NULL | booked/cancelled/superseded |
| category_code / note | text、noteはNULL可 | 予約ごとの区分/メモ。初期general/care/bundle |
| active_slot_id | uuid生成列 NULL可 | bookedならslot_id、取消/置換終了ならNULL |
| version | bigint NOT NULL | 設定/移動/取消の競合検出 |
| created_by / updated_by | uuid FK | 操作者。取込は専用主体と出所記録 |
| created_at / updated_at | timestamptz | サーバー日時 |
| cancelled_at/by、cancel_reason | NULL可 | 取消・置換終了情報 |

予約statusに来院/実施を混ぜない。Actualから実績を表示する。取消は枠占有を解放するが、予約行を物理削除しない。

### 一枠一件と交換

PostgreSQL案は `active_slot_id = CASE WHEN status='booked' THEN slot_id ELSE NULL END` という保存生成列に、`UNIQUE(active_slot_id) DEFERRABLE INITIALLY IMMEDIATE` を設ける。通常は即時確認、交換時だけ制約確認を遅延して2予約のslot_idを更新、commitまでに一枠一件を検査する。NULLの取消予約は同じ枠に複数履歴を残せる。

部分一意indexを遅延可能な一意constraintと混同しない。生成列・DBアクセスモデル・交換・rollbackを実PostgreSQLで確認する。これはSQL断片の設計説明で、適用可能な完成マイグレーションではない。SQLite版は同じDDLを使わず、占有モデル/更新順を別に検証する。

ReservationEvent：id、reservation_id、event_type(created/moved/swapped/settings_changed/cancelled/replaced)、from/to_slot_id、変更前後の必要項目、reason、actor_id、occurred_at、operation_id、version_before/after。双方向交換は同じoperation_idで2件記録する。

新規患者カードで置換する時は旧予約superseded＋新予約bookedを同時確定。予約カード同士は予約IDを保って交換。確認後に相手が変更された場合は409として再確認する。

患者の同時刻別PT予約を禁止するかは未確定。黙って患者単位の新しい一意制約を追加しない。

## 8. Visit / Actual / ActualEvent

| Entity | 主要列 | 意味 |
|---|---|---|
| Visit | id PK、patient_id FK、reservation_id FK NULL、service_date date、arrived_at timestamptz NULL、status、version、created/updated | 来院記録。予約なしを許す。同日患者一意にしない |
| Actual | id PK、visit_id FK、reservation_id FK NULL、performed_by_staff_id FK NULL、performed_resource_id FK NULL、performed_start/end timestamptz NULL、outcome、service_code、category_code、version、void_reason/voided_at | 実施明細。実PT/時刻を予定から分離 |
| ActualEvent | id PK、actual_id FK、event_type、変更前後、reason、actor、occurred_at、operation_id | 作成・記録・訂正・void履歴 |

Visit.status候補はarrived/left_without_treatment/closed/voided。無断欠席を来院と数えず、予約評価イベント等に保持する。最終状態名と必要な段階は現場確認で確定。

Actual.outcome候補はperformed/not_performed/voided。未実施理由を保存し、performed以外を実施数に含めない。1来院で複数実施を表現するが、物療の実績単位/担当者必須性は確認する。

Visitの任意予約参照は `(reservation_id, patient_id)` 複合FK候補で患者の一致を保証する。Reservation側に対応する一意キーを置く。ActualはVisitから患者を確定し、任意予約との一致をドメイン処理・実DB試験で検証する。

実施済みの必要担当/時刻はoutcomeに応じたCHECK・業務規則を設ける。実績訂正/voidは権限と理由必須、予約取消から自動実行しない。ActualEventに原値を保持し、現在明細はversion付きで訂正可能とする。旧版/新版の両方を実施数へ加算しない。締め済帳票はasOfと版を保存する。

## 9. User / AuditLog / OperationReceipt / Outbox

| Entity | 主要列・規則 |
|---|---|
| User | id、login_name UNIQUE、staff_id任意、role、認証情報参照、is_active、version。適切なパスワードハッシュ/院内認証 |
| AuthSession | id、user_id FK、session_secret_hash、issued/expires/revoked_at、device参照。ブラウザにDBパスワードを渡さず、セッション期限/失効を管理 |
| AuditLog | id、actor_id、server_time、device_id、action、entity_type/id、before/after必要項目jsonb、reason、operation_id。通常DB権限は追記のみ |
| OperationReceipt | actor_id＋operation_id UNIQUE、request_hash、結果参照/最小応答、created_at。業務更新と同時確定 |
| Outbox | id、operation_id、scope_date/resource、change_revision、created_at、delivered_at、retry_count。通知に不要な患者氏名を載せない |

OperationReceiptは同一キー・同一内容なら前の結果を返す。同じキーで異内容は拒否。保持期間と予約作成の安定IDを決め、期限切れ再送による無制限な再作成を避ける。通信断ではクライアントが同じoperationIdで状態照会/再送する。

AuditLogは業務履歴の代替ではない。自己申告のdevice_idだけで端末認証済みと扱わない。認証/出力/管理操作も監査し、トークンやパスワードは記録しない。

## 10. Excel・バックアップ・移行の管理データ

| Entity | 必要項目・役割 |
|---|---|
| ExportRun | export_id、対象期間、as_of、mapping_version、rules_version、actor、created_at、出力hash/院内保存参照 |
| ExportItem | export_id、actual_id、actual_version。再出力/訂正/二重取込を追跡 |
| ExcelMapping | id、version、template_hash、列/シート/型対応、承認者/日。実Excel確認後作成 |
| ImportBatch | id、source_system/device、source_hash、取得日時、検証結果、mapping_version、件数、操作者、適用日時 |
| ImportItem | batch_id、source_record_key、target_entity/id、source_record_hash、一意キー。二重取込防止 |
| BackupRun | id、方式、start/end、結果、schema_version、保管先参照、復元検証日時。本体は別保管 |
| ReportRun（将来） | 対象日、asOf、規則版、出力版、締め/訂正関係 |

## 11. トランザクション共通手順

1. 認証・権限・入力を検査しOperationReceiptを確認。
2. トランザクション開始。DayGuardを確保し日付/資源の決定順でロック。
3. 枠・予約・Shift/Overrideの最新状態/versionを検査。
4. 空き/移動/交換/上書き・実施との関係を検証。古い確認なら409。
5. 業務データ・Event・AuditLog・OperationReceipt・Outboxを同時保存。
6. 制約確認・commit、失敗なら全rollback。commit前に保存済みを返さない。
7. 通知配信と対象日再取得。再接続時は通知欠落を再取得で回復。

実施登録と予約移動も予約行version/ロックで順序を確定する。実施済みの通常移動は制限し、理由付き訂正へ分ける。シフト/Override変更で既存予約と衝突しても予約は削除しない。

他行を読むシフト規則をDB CHECKだけで強制しない。予約を保持したまま閉鎖できる現仕様との違いを避ける。FK/一意制約と業務規則の双方を試験する。

## 12. 未確定事項と公式根拠

Excel列・新患再来/リハ1判定、実績区分、物療定員/担当、300件の単位、患者重複予約、無予約来院、患者番号体系、終端時刻、監査/バックアップ保持、運用担当を確認する。

- PostgreSQL Constraints：<https://www.postgresql.org/docs/current/ddl-constraints.html>
- SET CONSTRAINTS：<https://www.postgresql.org/docs/current/sql-set-constraints.html>
- Concurrency Control：<https://www.postgresql.org/docs/current/mvcc.html>
- SQLite適用範囲：<https://www.sqlite.org/whentouse.html>
