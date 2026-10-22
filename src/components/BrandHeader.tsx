import Image from "next/image";
import Link from "next/link";

export function BrandHeader() {
  return (
    <header className="brand-header">
      <Link className="brand" href="/" aria-label="Prasidhika Shakya — Digital Marketing Strategy home">
        <Image
          src="/prasidhika-shakya-logo.png"
          alt="Prasidhika Shakya — Digital Marketing Strategy"
          width={977}
          height={255}
          priority
          className="brand-logo"
        />
      </Link>
    </header>
  );
}
