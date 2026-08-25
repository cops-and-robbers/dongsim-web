import { createLegalEmbedRoute } from "@/lib/legal/embed-route";

export const dynamicParams = false;
export const { GET, generateStaticParams } = createLegalEmbedRoute("en");
