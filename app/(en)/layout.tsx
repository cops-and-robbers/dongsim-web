import RootDocument, {
  rootMetadata,
  rootViewport,
} from "@/app/_root/RootDocument";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function EnglishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
