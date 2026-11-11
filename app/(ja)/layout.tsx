import RootDocument, {
  rootMetadata,
  rootViewport,
} from "@/app/_root/RootDocument";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function JapaneseRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootDocument lang="ja">{children}</RootDocument>;
}
