import { CssBackground } from '@/components/backgrounds/CssBackground';
import { SectionChoreography } from '@/components/motion/SectionChoreography';
import { SkillCarousel } from '@/components/skills/SkillCarousel';

/**
 * Skills: skill-group cards on a React Bits Depth Carousel rail (SkillCarousel). On
 * desktop the section pins and scroll turns the carousel once; on phones and with reduced
 * motion it's unpinned (swipe, buttons, arrow keys). Education is a quiet line under the
 * group index (after the cards on mobile).
 */
export function Skills() {
  return (
    <SectionChoreography id="skills" labelledBy="skills-title" className="relative isolate">
      <CssBackground className="bg-dots" />
      <SkillCarousel />
    </SectionChoreography>
  );
}
