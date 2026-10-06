"use client";

import { createContext, useContext } from "react";

/**
 * 지표 화면의 비교 상태 (#152). 숫자 칸, 증감, 차트가 모두 같은 값을 써서 한 곳에서 내려준다.
 * - on: 비교를 껐으면 증감과 회색 선, "이전 기간 N" 줄을 숨긴다
 * - word: "이전 기간" 또는 직접 고른 경우 "비교 기간"
 * - days: 비교 기간의 날짜들. 차트 툴팁이 "비교 기간 9.14"처럼 그날이 언제인지 같이 적는다
 */
export type CompareState = { on: boolean; word: string; days: string[] };

export const CompareContext = createContext<CompareState>({ on: true, word: "이전 기간", days: [] });

export const useCompare = () => useContext(CompareContext);
