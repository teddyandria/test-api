export interface Exercise {
    id: string;
    name: string;
    status?: string;
    type: string;
    config: {
        nbIterations: number;
        initialText: string;
        iterationDuration: number;
        textSize: {
            minWords: number;
            maxWords: number;
        }
    }
}

export interface ExerciseResponse {
    exercises: Exercise[];
}