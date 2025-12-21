// backend/.eslintrc.js
module.exports = {
  // 最基本的配置
  env: {
    node: true,
    es2021: true
  },
  // 关闭所有格式检查，只检查真正的问题
  rules: {
    'no-unused-vars': 'warn',  // 只警告未使用的变量
    'no-console': 'off',       // 允许console
    'no-debugger': 'warn',     // 只警告debugger
    'no-undef': 'error',       // 只检查未定义变量（真正的错误）
    'eqeqeq': 'off'           // 关闭==检查
  }
}