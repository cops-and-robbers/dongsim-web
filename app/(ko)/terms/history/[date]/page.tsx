import { createLegalHistoryPage } from "@/components/policy/history-page";

const page = createLegalHistoryPage("terms", "ko");

export const dynamicParams = false;
export const { generateStaticParams, generateMetadata } = page;
export default page.Page;
