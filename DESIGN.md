---
version: alpha
colors:
  ground: "#f2f4f7"
  surface: "#ffffff"
  ink: "#0a0a0a"
  muted: "#62676f"
  border: "#e0e3e7"
  control: "#bdc2c9"
  active: "#e6e9ed"
  data: "#1d5fbf"
  warning: "#92400e"
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "14px"
    lineHeight: "1.6"
rounded:
  panel: "8px"
  control: "6px"
spacing:
  gutter: "24px"
  canvas: "32px"
components:
  primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
---

# Plugin Inventory

## Overview

한국어 개인용 GitHub 관심 목록. 사용자가 확인한 표 중심 목업이 기준이다. '어떤 도구가 바뀌었고 계속 관리되는가'에 답한다. 특징은 저장소 릴리스와 개별 추적 범위의 활동 근거를 나란히 보여주는 것이다.

## Colors

Runtime canonical tokens are `web/styles.css :root`; frontmatter records their values. Map ground/surface/ink/muted/border/control/active/data/warning to the identically named CSS variables. 파란색은 새 릴리스와 활동 근거에만 쓴다. 선택 메뉴는 중립 회색이며 보관·수집 실패는 텍스트와 주의색을 함께 쓴다. 밝은 테마만 지원한다.

## Typography

시스템 한국어 sans-serif로 외부 폰트 요청을 없앤다. 본문14px, 메타13px, 제목24px. 수치는 tabular-nums. 이름과 경로는 긴 문자열도 줄바꿈한다.

## Layout

208px 사이드 영역, 32px 캔버스 여백, 목록과 320px 상세 사이24px. 1100px 이하 단일 열, 700px 이하 라벨 있는 행 목록. 휴대폰 상세에서 돌아오면 필터·검색·스크롤을 복원한다.

## Elevation & Depth

패널은 그림자 없이 경계와 흰 표면으로 분리한다. 장식용 KPI 타일·네온·그라데이션을 사용하지 않는다.

## Shapes

패널8px, 컨트롤6px. 모바일44px 터치 영역. 전역 스크롤바를 숨기지 않는다.

## Components

DOM 노드는 `web/render.mjs`, 상태는 `web/state.mjs`, 날짜는 `web/format.mjs`, 수집·웹 공용 판정은 `web/signals.mjs`가 소유한다. Native select의 OS 팝업을 허용한다. 검색은 한글 조합을 마친 뒤 적용한다.

## Do's and Don'ts

자료 출처·범위·확인 시각을 표시한다. 오류·비어 있음·미확인을 구분한다. 원문 설명과 메모는 textContent로 표시한다. reduced-motion을 지원한다.
