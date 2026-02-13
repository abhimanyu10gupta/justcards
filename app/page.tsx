import Image from "next/image";
import HeroGlobe from "../components/HeroGlobe";
import HeroGlobeThree from "../components/HeroGlobeThree";
import HeroMotionField from "@/components/HeroMotionField";
import HeroStackGallery from "@/components/HeroStackGallery";
import HeroMotionField2 from "@/components/HeroMotionField2";
import Navbar from "@/components/Navbar";
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <Navbar />
        <HeroMotionField2 />
    </div>
  );
}
