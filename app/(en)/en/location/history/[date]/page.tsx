import { createLegalHistoryPage } from "@/components/policy/history-page";

const page = createLegalHistoryPage("location", "en");

export const dynamicParams = false;
export const { generateStaticParams, generateMetadata } = page;
export default page.Page;
