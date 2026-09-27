import { z } from 'zod';
export const INDUSTRIES = ['Business services', 'Manufacturing', 'Software & technology', 'Retail & e-commerce', 'Construction', 'Healthcare', 'Hospitality', 'Other'] as const;
export const DEMO_MODEL = { version: 'demo-1', low: 3, high: 5, label: 'Illustrative operating-profit multiple' };
export const assessmentSchema = z.object({
  revenue: z.number().finite().positive().max(1e12),
  profit: z.number().finite().min(-1e12).max(1e12),
  employees: z.number().int().min(0).max(1e7),
  year: z.number().int().min(2000).max(new Date().getFullYear()),
  industry: z.enum(INDUSTRIES),
  location: z.string().trim().min(2).max(100),
}).refine(v => v.profit <= v.revenue, { message: 'Operating profit cannot exceed revenue for this check.', path: ['profit'] });
export type Assessment = z.infer<typeof assessmentSchema>;
export function estimate(input: Assessment) {
  const data = assessmentSchema.parse(input);
  return { low: data.profit > 0 ? data.profit * DEMO_MODEL.low : null, high: data.profit > 0 ? data.profit * DEMO_MODEL.high : null, margin: data.profit / data.revenue * 100, model: DEMO_MODEL.version };
}
export const wordCount = (value: string) => value.trim() ? value.trim().split(/\s+/u).length : 0;
export const SUCCESSOR_TRAITS = [
  { key: 'people', label: 'Keep the team together' },
  { key: 'brand', label: 'Preserve the brand' },
  { key: 'location', label: 'Keep the business local' },
  { key: 'ownerRole', label: 'Keep me involved after handover' },
  { key: 'price', label: 'Maximise the sale price' },
] as const;
export const PRIORITY_BUDGET = 20;
const points = z.number().int().min(0).max(10);
export const prioritiesSchema = z.object({ people: points, brand: points, location: points, ownerRole: points, price: points })
  .refine(v => Object.values(v).reduce((sum, n) => sum + n, 0) <= PRIORITY_BUDGET, 'Allocate no more than 20 priority points.');
export type SuccessorPriorities = z.infer<typeof prioritiesSchema>;
export const emptyPriorities = (): SuccessorPriorities => ({people:0,brand:0,location:0,ownerRole:0,price:0});
export function allocatePriority(values: SuccessorPriorities, key: keyof SuccessorPriorities, requested: number): SuccessorPriorities {
  const available = PRIORITY_BUDGET - Object.values(values).reduce((sum, n) => sum + n, 0) + values[key];
  return {...values, [key]: Math.max(0, Math.min(10, available, Math.round(Number.isFinite(requested) ? requested : 0)))};
}
export const profileSchema = z.object({
  assessment: assessmentSchema, company: z.string().trim().min(2).max(160), email: z.string().trim().email().max(254),
  saveConsent: z.literal(true), buyerVisible: z.boolean(), contactConsent: z.boolean(),
  culture: z.string().trim().max(8000).refine(v => wordCount(v) <= 500, 'Use 500 words or fewer.'),
  cultureShareConsent: z.boolean(),
  successorPriorities: prioritiesSchema.optional(),
}).superRefine((v,c) => {
  if(v.cultureShareConsent && !v.culture) c.addIssue({code:'custom',path:['culture'],message:'Add a culture statement before sharing it.'});
});
export type ProfileInput = z.infer<typeof profileSchema>;
export type SavedProfile = ProfileInput & { id: string; createdAt: string; updatedAt: string; modelVersion: string };
export const permissionsSchema = z.object({buyerVisible:z.boolean().optional(),contactConsent:z.boolean(),cultureShareConsent:z.boolean()});
