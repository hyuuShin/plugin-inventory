# 검증 기록

현재 상태: 구현·별도 코드 검토 보완·실제 GitHub Pages 배포 검증 완료. 2026-10-27 KST 기준 관심 목록은 비어 있다.

- 웹앱: https://hyuushin.github.io/plugin-inventory/
- 저장소: https://github.com/hyuuShin/plugin-inventory
- 첫 등록: https://github.com/hyuuShin/plugin-inventory/issues/new?template=track-tool.yml

## 실행한 검사

- `npm test`: 50개 통과. 수집 API·Issue 권한/중복·경로 해석·릴리스/활동 분리·관측 보존·주간 선정·저장 복구·게시 권한 정책 포함.
- `npm run build`, `npm run check`: 하위 경로의 정적 빌드, 공개 자료 schema, 정적 파일 연결과 비밀정보 검사.
- 공식 release digest로 확인한 actionlint v1.7.12: 두 workflow 검사 통과.
- frontend-design-premium strict project audit: 오류·위반·미결정 0.
- `designmd lint DESIGN.md`: 오류 0. 문서 토큰 참조의 선택적 경고는 CSS 소유권 설명으로 구분한다.

## 브라우저 확인

운영용 빈 데이터와 별도 임시 검증 사이트를 나누어 확인했다. 임시 사이트의 25개 기록과 주간 수치는 fixture이며 배포물에 들어가지 않는다.

- 빈 목록, 검색 결과 없음, 유형 필터12개, 더 보기25개, 부분 API 실패, 보관됨, 경로 없음, 릴리스 없음.
- 한국어 메모 검색과 URL 상태. 입력 중 같은 DOM 입력 요소가 유지되는 회귀 검증 RED→GREEN.
- HTML 문구가 실제 이미지나 스크립트가 되지 않고 텍스트로 표시됨.
- 휴대폰 상세에서 목록 숨김, 돌아오면25개 표시 상태 유지. 390/768px에서 페이지 가로 넘침 없음.
- 주간 변화와 새 후보 구분, 실제 비교 기간 표시, 증가량 미확인 안내, GitHub 양식의 정확한 필드 ID와 새 탭 링크.
- 활동이0인 차트의 최대값이0회로 표시되는 회귀 검증 RED→GREEN.

## 실제 배포와 Issue 수명 주기

`hyuuShin`으로 공개 저장소를 만들고 검토한 main을 게시했다. 각 원격 작업에만 계정을 명시했으며 gh의 전역 활성 계정은 바꾸지 않았다. Pages는 GitHub Actions 방식, HTTPS 사용, github-pages 환경의 배포 허용 브랜치는 main이다. 별도 서버·비밀 키·유료 실행기를 추가하지 않았다.

| 확인 | 실제 실행 | 결과 |
| --- | --- | --- |
| 첫 배포 | [40416784010](https://github.com/hyuuShin/plugin-inventory/actions/runs/40416784010) | verify·collect·prepare·deploy·record 성공, 사이트 HTTP 200 |
| 주간 부트스트랩 | [40416830446](https://github.com/hyuuShin/plugin-inventory/actions/runs/40416830446) | 성공, 실제 GitHub 후보 자료 게시 |
| 등록 | [40417117779](https://github.com/hyuuShin/plugin-inventory/actions/runs/40417117779) | 실제 기본 브랜치 폴더 등록, 상세·활동·메모 표시 |
| 본문 수정 | [40417328343](https://github.com/hyuuShin/plugin-inventory/actions/runs/40417328343) | 한국어 사용법 메모 변경 반영 |
| 닫기 | [40417808472](https://github.com/hyuuShin/plugin-inventory/actions/runs/40417808472) | 공개 JSON과 화면의 관심 항목 제거 |
| 다시 열기 | [40417929435](https://github.com/hyuuShin/plugin-inventory/actions/runs/40417929435) | 항목과 수정한 메모 복원 |
| 마지막 닫기 | [40418043872](https://github.com/hyuuShin/plugin-inventory/actions/runs/40418043872) | 모든 작업 성공, 관심 항목·도구 각각 0개 |

[검증용 Issue #1](https://github.com/hyuuShin/plugin-inventory/issues/1)은 소유자가 작성했고 현재 닫혀 있다. 외부 프로젝트에 Issue나 댓글을 작성하지 않았다. 최종 공개 JSON에서 임시 등록, 토큰, 이메일이 없음을 확인했다. 모의 수치를 배포하지 않았으며 과거 실제 관측은 이력에 보존한다.

실제 공개 사이트의 등록 링크, 빈 목록, 주간 화면, 주소 새로고침을 브라우저에서 확인했다. 주간 화면은 390px에서 가로 넘침이 없고 첫 주 비교 이력 부족 안내가 보인다. 최종 관심 목록도 가로 넘침 없이 비어 있다.

예약 작업은 활성 상태다. 매일 09:17 KST(`17 0 * * *`), 월요일 09:43 KST(`43 0 * * 1`), 수동 daily/weekly/dry_run을 사용할 수 있다. 미래 예약 실행은 아직 관측하지 않았으며 GitHub 사정에 따라 지연될 수 있다.

첫 주간 보고서는 새 후보 5개, 주간 증가량 후보 0개다. 실제 6~8일 비교 관측이 필요하다. 검색은 4개 쿼리와 후보 200개로 제한하므로 전체 결과를 확인하지 못한 부분 자료임을 화면에 표시한다.

## 별도 코드 검토

별도 검토자 gpt-6-astra가 전체 변경을 읽었다. 주요3건(주간 실패 시 이전 자료 보존, 불완전 릴리스 수집 시 확인 정보 보존, 등록 변경의 불필요한 후보 재조회)을 회귀 검증으로 재현한 뒤 수정했다. 상세의 이전 확인 비교 표시도 합의된 동작으로 보고 같은 수정 과정에서 반영했다. 전체50개 통과, 미룬 지적 없음.

## 구현 중 판단과 비용

1. Orca가 관리하는 별도 작업 공간에서 구현해 기존 main을 보호했다. 비용은 추가 로컬 작업 공간이며, 호스트 소유이므로 병합 후에도 보존한다.
2. 검증한 데이터 디렉터리를 통째로 교체해 파일 세대가 섞이는 것을 막았다. 교체 도중 중단되면 백업 복원이 필요하며 해당 복구를 구현·검증했다.
3. 수집기와 화면이 `web/signals.mjs`의 순수 상태 판단을 공유한다. 모듈 위치를 바꾸면 수집기의 import도 함께 갱신해야 한다.
4. main이 바뀌면 오래된 자료 저장 실행을 중단해 검증하지 않은 최신 코드를 실행하거나 덮어쓰지 않는다. 다음 대기·수동 실행까지 게시가 지연될 수 있다.
5. 빌드 검증은 현재 입력을 충실히 게시하는지 확인한다. 영구적으로 빈 목록을 가정하지 않으며 초기 빈 상태 보장은 별도 계약 테스트가 담당한다.
