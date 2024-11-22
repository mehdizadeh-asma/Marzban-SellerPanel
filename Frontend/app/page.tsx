"use client";

import Image from "next/image";

export default function Home() {
  return (
    <div className="text-center  bg-white vh-100 d-flex align-items-center justify-content-center">
      <Image alt="404" src="/404.jpg" width={380} height={253}></Image>
    </div>
  );
}
