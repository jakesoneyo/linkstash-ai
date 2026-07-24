// LinksModule 대응 TanStack Query 훅 — 목록/저장/삭제/재처리.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import {
  LinksPageSchema,
  type CreateLinkInput,
  type Link,
} from "../lib/schemas";

export interface LinksFilter {
  tags: string[];
  q: string;
}

const LINKS_KEY = ["links"] as const;

export function useLinks(filter: LinksFilter) {
  return useQuery({
    queryKey: [...LINKS_KEY, filter.tags.join(","), filter.q],
    queryFn: async () => {
      const { data } = await api.get("/links", {
        params: {
          tags: filter.tags.length > 0 ? filter.tags.join(",") : undefined,
          q: filter.q || undefined,
        },
      });
      return LinksPageSchema.parse(data);
    },
    // PENDING 상태 링크가 남아있는 동안만 짧은 간격으로 재조회하고, 전부 READY/FAILED로
    // 정리되면 자동으로 폴링을 멈춰 불필요한 요청을 만들지 않는다.
    refetchInterval: (query) => {
      const hasPending = query.state.data?.items.some(
        (link) => link.status === "PENDING",
      );
      return hasPending ? 2500 : false;
    },
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLinkInput) => {
      const { data } = await api.post<Link>("/links", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LINKS_KEY }),
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/links/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LINKS_KEY }),
  });
}

export function useReprocessLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Link>(`/links/${id}/reprocess`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LINKS_KEY }),
  });
}
