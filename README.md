# yotei_for_textbook
N予備校「予定調整くん」勉強用書き込みファイル

## yarn install memo
### 17章 X-Powered-By ヘッダの除去 [helmet]　
``` 
yarn add helmet@4.6.0 
```
インストール後app.jsに`app.use(helmet());`を加える  

### 17章 GitHub 認証の実装
```
yarn add passport@0.3.2  
yarn add passport-github2@0.1.9  
yarn add express-session@1.13.0
```

### 17章 Router オブジェクトをテストする [Jest/supertest]
```
yarn add jest@25.1.0 --dev  
yarn add supertest@3.1.0 --dev  
yarn add passport-stub@1.1.1 --dev
```

### 21章 AJAX による出欠の更新 [webpack/babel/jQuery]
```
yarn add webpack@4.26.1 webpack-cli@3.1.2 @babel/core@7.1.6 @babel/preset-env@7.1.6 babel-loader@8.0.4 --dev  
yarn add jquery@3.4.1  
```

## Markdown memo
```
# = 見出し1
## = 見出し2
### = 見出し3
#### = 見出し4
##### = 見出し5
###### = 見出し6
半角スペース2つ+改行 = 改行
バッククオート3つで挟み、改行 = コード
バッククォート1つで挟む = インラインコード
```
