import type { ScreenSpec } from '../agents/types';
import { chatCompletion, parseJsonFromModel } from './client';

/**
 * Have the AI generate rich, app-specific content for a screen.
 * Transforms a basic ScreenSpec (from planning) into one with
 * realistic items, descriptions, icons, and colors.
 */
export async function generateScreenContent(
  screen: ScreenSpec,
  productBrief: string,
  projectName: string,
  useMock: boolean
): Promise<ScreenSpec> {
  if (useMock) {
    return screen;
  }

  const system = `You are a mobile UI designer. Given a screen outline, fill it with REALISTIC, SPECIFIC content matching the product brief.

Return the SAME screen structure but with items populated as realistic app content.

Rules:
- items MUST have real titles, subtitles, data relevant to the app
- Use emoji icons that match the content (🔥🍕🎵📱💪 etc.)
- Use hex color hints that look good
- For stats: fill value with real numbers
- For hero: add description and kicker text
- For list: each row is a real data entry with meaningful title/subtitle
- For cards: each card is a specific item with real name and details
- For form: realistic form field labels
- For actions: specific call-to-action labels

Respond with ONLY the JSON object. No markdown.`;

  const user = `Product: ${projectName}
Brief: ${productBrief}
Screen: ${screen.title} (${screen.role})
Layout: ${screen.layout}

Current outline:
${JSON.stringify(
  {
    id: screen.id,
    title: screen.title,
    role: screen.role,
    layout: screen.layout,
    sections: screen.sections.map((s) => ({
      type: s.type,
      title: s.title || null,
      kicker: s.kicker || null,
      description: s.description || null,
      cta: s.cta || null,
      itemCount: s.items?.length || 0,
      itemTitles: s.items?.map((it) => it.title) || [],
    })),
  },
  null,
  2
)}

Fill each section's items with realistic content for this app. Return the full updated screen JSON with the same structure and section types. Each item should have title, subtitle (with real details), icon (emoji), and where applicable value, badge, and color.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.6, maxTokens: 1500 }
    );

    const parsed = parseJsonFromModel<Partial<ScreenSpec>>(result.content);
    if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return screen;
    }

    // Merge AI content into existing screen structure
    return {
      ...screen,
      sections: parsed.sections.map((aiSection, i) => {
        const original = screen.sections[i] || { type: aiSection.type || 'hero' };
        return {
          type: (aiSection.type as any) || original.type,
          title: aiSection.title || original.title,
          description: aiSection.description || original.description,
          kicker: aiSection.kicker || original.kicker,
          cta: aiSection.cta || original.cta,
          color: aiSection.color || original.color,
          items: Array.isArray(aiSection.items) && aiSection.items.length > 0
            ? aiSection.items.map((it: any) => ({
                title: it.title || 'Item',
                subtitle: it.subtitle || undefined,
                badge: it.badge || undefined,
                icon: it.icon || undefined,
                value: it.value || undefined,
                color: it.color || undefined,
              }))
            : original.items || [],
        };
      }),
    };
  } catch {
    return screen;
  }
}
