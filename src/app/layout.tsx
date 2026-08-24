import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Builder — NSUT | ATS-Perfect Resumes in 60 Seconds",
  description:
    "Generate professional, ATS-optimized resumes powered by AI and LaTeX. Choose from college or off-campus templates, input your data, and download a pixel-perfect PDF instantly.",
  keywords: [
    "resume builder",
    "NSUT",
    "ATS resume",
    "LaTeX resume",
    "college resume",
    "placement resume",
    "AI resume",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
