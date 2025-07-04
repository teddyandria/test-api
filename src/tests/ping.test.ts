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

    });

    it("POST /api/exercises - doit créer un exercice", async () => {
        const response = await request(baseUrl)
            .post("/exercises")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "My Writing Exercise",
                type: "ExquisiteCorpse",
                config: {
                    nbIterations: 5,
                    initialContent: "Once upon a time...",
                    iterationDuration: 300,
                    textSize: {
                        minWords: 10,
                        maxWords: 100
                    }
                }
            });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        createdExerciseId = response.body.id;
    });
    //
    // it("GET /api/exercises/{id} - doit retourner l'exercice créé", async () => {
    //     const response = await request(baseUrl)
    //         .get(`/exercises/${createdExerciseId}`)
    //         .set("Authorization", `Bearer ${token}`);
    //     expect(response.status).toBe(200);
    //     expect(response.body).toHaveProperty("id", createdExerciseId);
    // });

// /*    it("POST /api/exercises/{id}/finish - doit terminer l'exercice", async () => {
//         const response = await request(baseUrl)
//             .post(`/exercises/${createdExerciseId}/finish`)
//             .set("Authorization", `Bearer ${token}`);
//         expect([200, 204]).toContain(response.status);
//     });*/

    // it("GET /api/exercises/{id}/events - doit retourner les événements de l'exercice", async () => {
    //     const response = await request(baseUrl)
    //         .get(`/exercises/${createdExerciseId}/events`)
    //         .set("Authorization", `Bearer ${token}`);
    //     expect(response.status).toBe(200);
    //     expect(Array.isArray(response.body)).toBe(true);
    // });

    // it("DELETE /api/exercises/{id} - doit supprimer l'exercice", async () => {
    //     const response = await request(baseUrl)
    //         .delete(`/exercises/${createdExerciseId}`)
    //         .set("Authorization", `Bearer ${token}`);
    //     expect([200, 204]).toContain(response.status);
    // });
    //
    // it("DELETE /api/exercises - doit retourner une erreur ou 405", async () => {
    //     const response = await request(baseUrl)
    //         .delete("/exercises")
    //         .set("Authorization", `Bearer ${token}`);
    //     expect([400, 404, 405]).toContain(response.status);
    // });
});