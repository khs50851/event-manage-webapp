// type은 영어(conventional commits 표준)를 쓰고, 설명(subject)은 한국어로 작성한다.
// 예: "feat: 로그인 폼에 유효성 검사 추가"
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0], // 한글 설명은 대소문자 규칙 대상이 아니므로 비활성화
  },
};

export default config;
