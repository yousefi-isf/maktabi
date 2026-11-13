interface ModuleScore {
	moduleId: string | null;
	score: number | null;
	isAbsent: boolean;
}

/** All defined modules must have a passing competency score. */
export function areModulesPassed(
	moduleIds: readonly string[],
	scores: readonly ModuleScore[],
): boolean {
	if (moduleIds.length === 0) return false;
	const scoresByModule = new Map<string, ModuleScore[]>();
	for (const score of scores) {
		if (!score.moduleId) continue;
		const entries = scoresByModule.get(score.moduleId) ?? [];
		entries.push(score);
		scoresByModule.set(score.moduleId, entries);
	}
	return moduleIds.every((id) => {
		const entries = scoresByModule.get(id);
		return (
			entries !== undefined &&
			entries.every(
				(entry) => !entry.isAbsent && entry.score !== null && entry.score >= 10,
			)
		);
	});
}
