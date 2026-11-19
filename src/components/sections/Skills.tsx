import { CssBackground } from '@/components/backgrounds/CssBackground';
import { SectionChoreography } from '@/components/motion/SectionChoreography';
import { SkillDeck } from '@/components/skills/SkillDeck';

/**
 * Skills: a deck of six skill-group cards (SkillDeck). On desktop the section pins and
 * scroll deals through the deck once; elsewhere the cards are a plain grid. Education
 * sits in the left column.
 */
export function Skills() {
  return (
    <SectionChoreography id="skills" labelledBy="skills-title" className="relative isolate">
      <CssBackground className="bg-dots" />
      <SkillDeck />
    </SectionChoreography>
  );
}
