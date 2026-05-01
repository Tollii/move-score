import type { Id } from '../convex/_generated/dataModel';

export const personalPoiCategories = [
	{ id: 'work', label: 'Jobb' },
	{ id: 'school', label: 'Skole' },
	{ id: 'family', label: 'Familie' },
	{ id: 'other', label: 'Annet' }
] as const;

export type PersonalPoiCategory = (typeof personalPoiCategories)[number]['id'];

export type PersonalPoi = {
	id: Id<'personalPois'>;
	label: string;
	category: PersonalPoiCategory;
	address: string | null;
	lat: number;
	lon: number;
	createdAt: number;
	updatedAt: number;
};

export function personalPoiCategoryLabel(category: PersonalPoiCategory) {
	return personalPoiCategories.find((item) => item.id === category)?.label ?? 'Annet';
}
