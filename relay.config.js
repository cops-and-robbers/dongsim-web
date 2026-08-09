// Relay 컴파일러 설정. next.config.ts 의 compiler.relay 와 값이 일치해야 한다.
// 어드민 GraphQL 계약(schema.graphql)을 읽어 컴포넌트에 코로케이트된
// graphql`` 태그를 __generated__ 아티팩트로 컴파일한다.
module.exports = {
  src: "./",
  language: "typescript",
  schema: "./schema.graphql",
  artifactDirectory: "./__generated__",
  excludes: [
    "**/node_modules/**",
    "**/__generated__/**",
    "**/.next/**",
    "**/public/**",
  ],
  eagerEsModules: false,
};
