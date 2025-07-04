import request from "supertest";

const baseUrl = "https://owl-writey.hemit.fr/api";


async function authenticate(login: string, pwd: string): Promise<string> {
    const url = 'https://www.googleapis.com/';
    const APIKey = 'AIzaSyDpdYdgvEwYIKGr_rmh37DipL3djZ-KF3k'
    const response = await request(url).post(`/identitytoolkit/v3/relyingparty/verifyPassword?key=${APIKey}`).send({
        "email": login,
        "password": pwd,
        "returnSecureToken": true
    });

    expect(response.status).toBe(200);

    return response.body.idToken;
}

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
    let createdExerciseId: string;

    it("GET /api/exercises - doit retourner 200 et un tableau", async () => {
        const response = await request(baseUrl)
            .get("/exercises")
            .set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);

        expect(Array.isArray(response.body.exercises)).toBe(true);

        // Nettoyer les exercices de test
        const exercises = response.body.exercises;
        for (const exercise of exercises) {
            if (exercise.name === "Hello") { // Identifier les exercices de test
                await request(baseUrl)
                    .delete(`/exercises/${exercise.id}`)
                    .set("Authorization", `Bearer ${token}`);
                console.log(`Exercice de test supprimé: ${exercise.id}`);
            }
        }
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
        console.log("Location Header:", response.headers.location);

        return response.headers.location.split('/').pop()!;
    });

    it("GET /api/exerices - doit retourner un exercice créé à l'aide de son ID", async () => {
        const response = await request(baseUrl)
            .get("/exercises")
            .set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.exercises)).toBe(true);

        const exercises = response.body.exercises;
        expect(exercises.length).toBeGreaterThan(0);
        createdExerciseId = exercises[exercises.length - 1].id;

        console.log("Created Exercise ID:", createdExerciseId);
    })

    it("DELETE /api/exercises/{id} - doit supprimer l'exercice", async () => {

        // Créer d'abord un exercice
        const postResponse = await request(baseUrl)
            .post("/exercises")
            .set("Authorization", `Bearer ${token}`)
            .set("Content-Type", "application/json")
            .send(exercice);

        const exerciseId = postResponse.headers.location.split('/').pop()!;

        // Suppression de l'exercice
        const deleteResponse = await request(baseUrl)
            .delete(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect([200, 204]).toContain(deleteResponse.status);

        // Vérifier que l'exercice a bien été supprimé
        const getResponse = await request(baseUrl)
            .get(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(getResponse.status).toBe(404);
    });

    it("POST /api/exercises/{id}/finish - doit marquer l'exercice comme terminé", async () => {
        // Créer d'abord un exercice
        const postResponse = await request(baseUrl)
            .post("/exercises")
            .set("Authorization", `Bearer ${token}`)
            .set("Content-Type", "application/json")
            .send(exercice);

        const exerciseId = postResponse.headers.location.split('/').pop()!;

        // Marquer l'exercice comme terminé
        const finishResponse = await request(baseUrl)
            .post(`/exercises/${exerciseId}/finish`)
            .set("Authorization", `Bearer ${token}`);

        expect(finishResponse.status).toBe(204);

        // Vérifier que l'exercice est bien marqué comme terminé
        const getResponse = await request(baseUrl)
            .get(`/exercises/${exerciseId}`)
            .set("Authorization", `Bearer ${token}`);

        console.log("Statut de l'exercice après finish:", getResponse.body.status);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toHaveProperty("status", "Finished");

    });
});