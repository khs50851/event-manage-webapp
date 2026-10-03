import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Prettier와 충돌하는 포맷팅 규칙 비활성화 (항상 배열 마지막에 위치)
  eslintConfigPrettier,
];

export default eslintConfig;
