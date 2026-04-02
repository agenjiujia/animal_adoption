"use client";

import { useCallback, useEffect, useRef } from "react";

const ROOT_MARGIN_PX = 280;

/**
 * 宠物卡片列表：接近底部时调用 ahooks useInfiniteScroll 返回的 loadMore。
 * 使用 window 滚动 + 哨兵 getBoundingClientRect，避免 html/body 谁滚动与 ahooks target 不一致导致永不加载。
 */
export function usePetCardInfiniteLoadMore(
  loadMore: () => void,
  opts: {
    noMore: boolean;
    loading: boolean;
    loadingMore: boolean;
    listLength: number;
  }
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const probe = useCallback(() => {
    const { noMore, loading, loadingMore } = optsRef.current;
    if (noMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el || typeof window === "undefined") return;
    const top = el.getBoundingClientRect().top;
    if (top <= window.innerHeight + ROOT_MARGIN_PX) {
      loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    probe();
  }, [probe, opts.listLength, opts.noMore, opts.loading, opts.loadingMore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => probe();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [probe]);

  return sentinelRef;
}
