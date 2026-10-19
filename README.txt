2026-10-19 シフト改善版
最初に「シフト改善版_最初に読む.txt」を参照してください。
画面確認は一番上の index.html、中央開発版は従来の server/ です。
以下は以前の工程の説明です。今回の確認結果は新しい説明書とshift-*-results.jsonに記載しています。

柴田屋OZ — 実績管理 v4 / 自宅Wi-Fi架空データ確認候補

2026-10-07追加：WindowsのOz.Server.dll実行拒否を実機で確認。
次の手順はACTUAL_V4_PRIVATE_CI.txt。開発用ソースを非公開GitHubで検証。
自宅Windowsの保護設定を解除せず、起動失敗を未解決として保持します。

今回の手順は ACTUAL_V4_START.txt、検証結果は ACTUAL_V4_VERIFICATION.txt。
完全ソース一式です。v3を残し、新しいフォルダーへ解凍して起動します。
GitHubへアップロードしません。公開デモは変更しません。
追加：来院・実施・未実施・キャンセル記録、当日の実績履歴一覧。
保護：予約表、月間PT×日付マトリクス、検索、Pointer操作、予約設定・移動、
slotOverride、中央競合通知、保存再送保護。
原本frontend/src/app.js、candidate/index.html、001_initial.sqlは未変更です。
実績訂正、Excel/日報/人数集計、本番認証・TLS・導入は次工程です。
今回のWindows起動・実機確認はまだ未実施です。
以下は過去工程の記録です。過去のPASSはv4実機確認を意味しません。

2026-10-06 追記: 院外の架空データ専用PostgreSQL 18検証経路を追加。
最初に NATIVE_CI_CHECKPOINT.txt を読んでください。Windows実DB検証は未完了です。

2026-10-06 追記: 実PostgreSQLのロック待ち観測を修正した検証用ZIPです。
変更点と未実施項目は NATIVE_LOCK_OBSERVATION_UPDATE.txt を先に確認してください。
お使いのWindowsでは署名のない検証DLLが実行制御でブロックされたため、
このZIPを同じPCで繰り返し実行しても検証完了にはなりません。

予約表・月間シフト・中央API・DB Schema・実PG検証ツールを含む完全ソース一式です。
今回、PC/タッチの画面操作38項目を確認するブラウザテストを追加しました。

重要: 画面操作テストはまだ未実行です。
このLinux環境ではChrome起動に必要なローカル通信が拒否されました。
API起動2項目と結果判定の自己テスト7項目のみPASSです。
画面操作やWindows実機、実PostgreSQLをPASSと表記していません。

今回はGitHubへのアップロードは不要です。公開サイトは変更していません。
本番Windowsインストーラーではありません。架空患者で検証するソース配布です。

最初に読む: docs/BROWSER_VERIFICATION.md
今回の結果: BROWSER_VERIFICATION.txt
Windowsでのブラウザ起動: browser-tests/Run-Browser-Verification.ps1
実PostgreSQLの検証: docs/WINDOWS_NATIVE_VERIFICATION.md
次工程条件: docs/NEXT_REVIEW.md

Windowsで使うもの
.NET 10 SDK / Node.js 22以降 / ChromeまたはEdge / 準備済みNuGet・Node依存。
実PG検証は別途PostgreSQL 18が必要です。
このZIPにSDK・ブラウザ・依存パッケージ・実行時DB・資格情報は同梱しません。

既存の保護対象ソースは前工程と同一です。
月間シフトは縦PT×横日付、予約表は全PTと中央時間列の構造を維持しています。
過去の検証結果・manifestはその工程時点の記録です。
今回の配布内容のチェックサムはreports/browser-package-manifest.jsonを参照してください。

Windowsで結果JSONを確認した後、実機・院内LAN・認証/TLS・Excel/印刷の段階へ進みます。
Golden Masterの昇格と実患者への導入は保留しています。
