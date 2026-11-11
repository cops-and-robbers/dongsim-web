import RootDocument, {
  rootMetadata,
  rootViewport,
} from "@/app/_root/RootDocument";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function KoreanRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootDocument lang="ko">{children}</RootDocument>;
}
