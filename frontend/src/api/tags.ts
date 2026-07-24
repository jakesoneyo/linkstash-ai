// GET /tags 대응 훅 — 태그 필터 UI에서 링크 개수를 함께 보여주기 위함.
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../lib/axios";
import { TagSchema } from "../lib/schemas";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await api.get("/tags");
      return z.array(TagSchema).parse(data);
    },
  });
}
