import { Hero } from '@/components/sections/Hero';
import { About } from '@/components/sections/About';
import { HeroStage } from '@/components/sections/HeroStage';
import { OutlineStage } from '@/components/sections/OutlineStage';
import { ScrollRail } from '@/components/layout/ScrollRail';
import { AmbientBackground } from '@/components/backgrounds/AmbientBackground';
import { Experience } from '@/components/sections/Experience';
import { Projects } from '@/components/sections/Projects';
import { Skills } from '@/components/sections/Skills';
import { Contact } from '@/components/sections/Contact';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroStage>
          <Hero />
          <About />
        </HeroStage>
        <OutlineStage>
          <Experience />
          <Projects />
        </OutlineStage>
        <Skills />
        <Contact />
      </main>
      <Footer />
      <ScrollRail />
    </>
  );
}
