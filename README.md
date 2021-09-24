# ae-karas
An AfterEffects plugin for karas.

---
ae-karas

[![NPM version](https://img.shields.io/npm/v/ae-karas.svg)](https://npmjs.org/package/ae-karas)

## Install
```
npm install ae-karas
```

## Dev

1. `cd ~/Library/Application\ Support/Adobe/CEP/extensions`  如果目录不存在就创建一个
2. `ln -s 项目根目录/bundle ./ae-karas`  软连接ae插件到当前bundle目录
3. `defaults write com.adobe.CSXS.10 PlayerDebugMode 1`  跑一下这个命令打开开发模式
4. `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`  高版本的ae可能需要打开11
5. `npm run dev` watch编译
6. 下载`https://github.com/Adobe-CEP/CEP-Resources/tree/master/CEP_9.x` 根据环境选择
7. 打开`cefclient`，输入`http://localhost:8735` 查看log

上传功能需自定义配置src/util/config.js中的URL并实现对应服务端接口后，重新打包。

# License
[MIT License]
