export type Energy = 'Low' | 'Medium' | 'High'
export type TaskKind = 'study' | 'interview' | 'tidy' | 'project' | 'general'

export interface PlanningOptions {
  task: string
  availableMinutes: number
  energy: Energy
  variation?: number
}

export interface PlanStep {
  id: string
  title: string
  minutes: number
  explanation: string
  done: boolean
  adapted?: boolean
}

export interface Plan {
  title: string
  reason: string
  task: string
  availableMinutes: number
  plannedMinutes: number
  energy: Energy
  steps: PlanStep[]
  variation: number
  feedbackCount: number
}

export interface SmallerStepOptions {
  task: string
  remainingMinutes: number
  energy: Energy
  unfinishedSteps: PlanStep[]
  targetStepId?: string
  feedbackCount: number
}

export interface SmallerStepResult {
  step: PlanStep
  explanation: string
}

const stepCounts: Record<number, Record<Energy, number>> = {
  5: { Low: 1, Medium: 2, High: 2 },
  15: { Low: 3, Medium: 3, High: 4 },
  30: { Low: 3, Medium: 4, High: 5 },
  60: { Low: 4, Medium: 5, High: 6 },
}

const timeShare: Record<Energy, number> = {
  Low: 0.6,
  Medium: 0.8,
  High: 1,
}

function getTaskKind(task: string): TaskKind {
  const normalized = task.toLowerCase()

  if (/\b(interview|job|resume|cv|recruiter)\b/.test(normalized)) return 'interview'
  if (/\b(clean|tidy|organize|organise|declutter|room|desk)\b/.test(normalized)) return 'tidy'
  if (/\b(study|learn|review|revise|practice|exam|quiz|java|python|math|biology)\b/.test(normalized)) {
    return 'study'
  }
  if (/\b(project|code|coding|build|bug|feature|app|website|program|implement)\b/.test(normalized)) {
    return 'project'
  }
  return 'general'
}

function getFocus(task: string): string {
  const focus = task
    .trim()
    .replace(
      /^(?:(?:i need to|i want to|i have to|i would like to|help me|please)\s+)?(?:study|learn|review|revise|practice|prepare(?:\s+for)?|finish|complete|build|create|clean|tidy|organize|organise|work on)\s+/i,
      '',
    )
    .replace(/^(?:a|an|the)\s+/i, '')
    .split(/[.!?;\n]/, 1)[0]
    .trim()

  return focus.length > 64 ? `${focus.slice(0, 61).trimEnd()}…` : focus || 'your task'
}

function getActions(kind: TaskKind, focus: string): string[] {
  switch (kind) {
    case 'study':
      return [
        `Pick one idea in ${focus} to focus on`,
        `Read one short example of ${focus}`,
        `Try one easy ${focus} question without notes`,
        'Check your answer and mark one thing to revisit',
        `Explain one ${focus} idea in your own words`,
        `Try one more small question about ${focus}`,
      ]
    case 'interview':
      return [
        'Choose one likely interview question',
        'Jot down three bullet points for your answer',
        'Say your answer aloud once, without aiming for perfect',
        'Notice one part of your answer you want to sharpen',
        'Practice that answer one more time',
        'Write down one question you want to ask them',
      ]
    case 'tidy':
      return [
        'Choose one small surface to reset',
        'Collect only the items that belong on that surface',
        'Put away five items, then pause',
        'Clear one small corner or patch of floor',
        'Step back and decide whether to stop here',
        'Choose five more items only if you still have energy',
      ]
    case 'project':
      return [
        `Write one line describing what “done” means for ${focus}`,
        `Open ${focus} and find the next unfinished piece`,
        'Break that piece into one action you can do in ten minutes',
        'Work on just that one action',
        'Check what changed and note the next open question',
        'Save your work and write down where to pick up next',
      ]
    case 'general':
      return [
        `Write down what “done” looks like for ${focus}`,
        'Gather the one thing you will need to begin',
        `Spend a few minutes on the first visible part of ${focus}`,
        'Pause and note what is already clearer',
        'Choose one small follow-up action',
        'Wrap up by noting where you will start next time',
      ]
  }
}

function distributeMinutes(total: number, count: number): number[] {
  const base = Math.floor(total / count)
  const remainder = total % count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

export function createPlan(options: PlanningOptions): Plan {
  const task = options.task.trim().replace(/\s+/g, ' ')
  const availableMinutes = options.availableMinutes
  const variation = Math.max(0, Math.floor(options.variation ?? 0))
  const plannedMinutes = Math.max(1, Math.floor(availableMinutes * timeShare[options.energy]))
  const count = Math.min(stepCounts[availableMinutes][options.energy], plannedMinutes)
  const kind = getTaskKind(task)
  const actions = getActions(kind, getFocus(task))
  const durations = distributeMinutes(plannedMinutes, count)
  const energyDescription = options.energy.toLowerCase()
  const pace =
    options.energy === 'Low'
      ? 'a gentle set of small actions, with breathing room'
      : options.energy === 'Medium'
        ? 'a steady set of manageable actions'
        : 'a focused sequence that makes use of your momentum'

  return {
    title:
      options.energy === 'Low'
        ? 'A gentle start'
        : options.energy === 'Medium'
          ? 'A steady plan'
          : 'A focused plan',
    reason: `With ${availableMinutes} minutes and ${energyDescription} energy, I chose ${pace}.`,
    task,
    availableMinutes,
    plannedMinutes,
    energy: options.energy,
    variation,
    feedbackCount: 0,
    steps: durations.map((minutes, index) => {
      const actionIndex = (index + variation) % actions.length
      return {
        id: `step-${variation}-${index}`,
        title: actions[actionIndex],
        minutes,
        explanation:
          index === 0
            ? 'Start here; you do not need to think about the whole task yet.'
            : 'A small follow-up that keeps the task moving without making it a marathon.',
        done: false,
      }
    }),
  }
}

function getSmallerActions(kind: TaskKind, focus: string): string[] {
  switch (kind) {
    case 'study':
      return [
        `Write down one ${focus} term you remember`,
        `Open your notes to the ${focus} section`,
        `Read one sentence about ${focus}`,
      ]
    case 'interview':
      return [
        'Pick one interview question and read it once',
        'Write a single bullet point for one answer',
        'Say just the first sentence of your answer aloud',
      ]
    case 'tidy':
      return [
        'Put one item back where it belongs',
        'Move three things into one small pile',
        'Clear a space about the size of a book',
      ]
    case 'project':
      return [
        'Open the project and find the next task',
        'Write one sentence about the next change',
        'Open the file or tool you need; nothing more yet',
      ]
    case 'general':
      return [
        'Gather the one item you need first',
        'Write the very first physical action on a note',
        'Open the page or tool you will use',
      ]
  }
}

export function makeSmallerStep(options: SmallerStepOptions): SmallerStepResult | null {
  const unfinished = options.unfinishedSteps.filter((step) => !step.done)
  if (unfinished.length === 0) return null

  const target =
    unfinished.find((step) => step.id === options.targetStepId) ?? unfinished[0]
  const smallerActions = getSmallerActions(getTaskKind(options.task), getFocus(options.task))
  const actionIndex = (unfinished.length + options.feedbackCount) % smallerActions.length
  const energyLimit = options.energy === 'Low' ? 2 : options.energy === 'Medium' ? 3 : 5
  const feedbackLimit = options.feedbackCount > 0 ? 1 : energyLimit
  const minutes = Math.max(
    1,
    Math.min(target.minutes, Math.max(1, options.remainingMinutes), feedbackLimit),
  )
  const remaining = Math.max(0, options.remainingMinutes)

  return {
    step: {
      ...target,
      title: smallerActions[actionIndex],
      minutes,
      explanation:
        options.feedbackCount > 0
          ? 'You said the last step was not quite right, so this is a one-minute starting point. The other unfinished steps are unchanged.'
          : `We made “${target.title}” smaller to fit your ${options.energy.toLowerCase()} energy and about ${remaining} estimated minutes left. The other unfinished steps are unchanged.`,
      adapted: true,
      done: false,
    },
    explanation:
      options.feedbackCount > 0
        ? 'I heard you. I reduced this to a one-minute first move; your plan stays here if you want to return to it.'
        : `I made “${target.title}” into one smaller first action. About ${remaining} minutes remain in your selected time window.`,
  }
}
