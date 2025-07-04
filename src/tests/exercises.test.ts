import request from "supertest";
import { Exercise, ExerciseResponse } from "../types/exercise.types";

const baseUrl = "https://owl-writey.hemit.fr/api";
const GOOGLE_AUTH_URL = 'https://www.googleapis.com/';
const API_KEY = 'AIzaSyDpdYdgvEwYIKGr_rmh37DipL3djZ-KF3k';
const TEST_USER = "testuser@example.com";
const TEST_PASS = "testpassword";

const exercice = {
    name: "Hello",
    type: "ExquisiteCorpse",
    config: {
        nbIterations: 5,
        initialText: "Histoire",
        iterationDuration: 120,
        textSize: {
            minWords: 10,
            maxWords: 100
        }
    }
};

let token: string;

async function authenticate(login: string, pwd: string): Promise<string> {
    const response = await request(GOOGLE_AUTH_URL)
        .post(`/identitytoolkit/v3/relyingparty/verifyPassword?key=${API_KEY}`)
        .send({
            email: login,
            password: pwd,
            returnSecureToken: true
        });

    expect(response.status).toBe(200);
    return response.body.idToken;
}

async function createExercise() {
    const response = await request(baseUrl)
        .post("/exercises")
        .set("Authorization", `Bearer ${token}`)
        .set("Content-Type", "application/json")
        .send(exercice);

    return response.headers.location.split('/').pop()!;
}

async function cleanupTestExercises() {
    const response = await request(baseUrl)
        .get("/exercises")
        .set("Authorization", `Bearer ${token}`);

    const deletePromises = (response.body as ExerciseResponse).exercises
        .filter((ex: Exercise) => ex.name === "Hello" || ex.status === "Finished")
        .map((ex: Exercise) => request(baseUrl)
            .delete(`/exercises/${ex.id}`)
            .set("Authorization", `Bearer ${token}`)
        );

    await Promise.all(deletePromises);
}

beforeAll(async () => {
    token = await authenticate(TEST_USER, TEST_PASS);
});

describe("External API Tests", () => {
    it("should return 200 OK for the root endpoint", async () => {
        const response = await request(baseUrl).get("/ping");
        expect(response.status).toBe(200);
    });
});

describe("Exercises API", () => {
    beforeEach(async () => {
        await cleanupTestExercises();
    });

    afterAll(async () => {
        await cleanupTestExercises();
    });

    it("GET /api/exercises - doit retourner 200 et un tableau", async () => {
        const response = await request(baseUrl)
            .get("/exercises")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.exercises)).toBe(true);
    });

    it("POST /api/exercises - doit créer un exercice", async () => {
        const response = await request(baseUrl)
            .post("/exercises")
            .set("Authorization", `Bearer ${token}`)
            .set("Content-Type", "application/json")
            .send(exercice);

        expect(response.status).toBe(201);
        expect(response.headers.location).toBeDefined();
        expect(response.headers.location).toContain('/exercises/');
    });

    it("GET /api/exercises/{id} - doit retourner un exercice spécifique", async () => {
        const exerciseId = await createExercise();
        const response = await request(baseUrl)
            .get(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(exerciseId);
    });

    it("DELETE /api/exercises/{id} - doit supprimer l'exercice", async () => {
        const exerciseId = await createExercise();

        const deleteResponse = await request(baseUrl)
            .delete(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect([200, 204]).toContain(deleteResponse.status);

        const getResponse = await request(baseUrl)
            .get(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(getResponse.status).toBe(404);
    });

    it("POST /api/exercises/{id}/finish - doit marquer l'exercice comme terminé", async () => {
        const exerciseId = await createExercise();

        const finishResponse = await request(baseUrl)
            .post(`/exercises/${exerciseId}/finish`)
            .set("Authorization", `Bearer ${token}`);

        expect(finishResponse.status).toBe(204);

        const getResponse = await request(baseUrl)
            .get(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toHaveProperty("status", "Finished");
    });
});