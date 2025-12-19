import React from "react";

export default function Footer(): React.ReactElement {
  return (
    <footer className="text-center   text-center text-muted ">
      Marzban Seller Panel v{process.env.npm_package_version}
    </footer>
  );
}
