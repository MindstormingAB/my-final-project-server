# Final project - The Epilepsy App's API

I built this backend during the final sprint of the Technigo Bootcamp for frontend developers (fall 2020 edition). The purpose of this project was to wrap up everything I learnt during the program and to build one bigger application.

## What it does

For more information about the application, please visit the frontend repositories https://github.com/MindstormingAB/my-final-project-client and https://github.com/MindstormingAB/my-final-project-client-pwa.

## The approach

In this backend, I've created 5 different schemas:
- `userSchema` used by the `User` model for the `users` collection, where the registered user will store email address and password and where a secured access token was generated at user creation. Later on, in the profile page, the user has the possibility to add first name, surname and birth date.
- `seizureSchema` used by the `Seizure` model for the `seizures` collection, where the registered user will store seizure activity linked to his/her profile with userId. The seizure types are validated by `data/seizure-types.json`.
- `contactSchema` used by the `Contact` model for the `contacts` collection, where the registered user will store emergency and healthcare contacts linked to his/her profile with userId. The contact types and categoies are validated by `data/contact-types.json`.
- `seizureTypeSchema` used by the `SeizureType` model for the `seizuretypes` collection, pre-populated in the database using data in `data/seizure-types.json`
- `contactTypeSchema` used by the `ContactType` model for the `contacttypes` collection, pre-populated in the database using data in `data/contact-types.json`.

Here is a description of the different endpoints:
- `GET /` returns the name of the API and a list of all endpoints
- `POST /users` to be used when signing up. The properties `email` and `password` are the only ones that could be populated using this endpoint, `email` has to be unique and `password` is hashed before storage. The endpoint responds with an user ID, a random access token and the rest of the user details, except password.
- `POST /sessions` to be used when signing in. This endpoint will search for an existing user with matching email and compare the entered password with the user's hashed password. In case of positive authentication, the endpoint will respond with the user details (except password), the seizure and contact data linked to the userId, and the seizure and contact types.
- `GET /userdata` to be used when retrieving all user data. This endpoint is secured by a authentication function that checks if the user's access token and user ID provided in the `Authorization` header exist and are referring to the same user.
- `PATCH /userdata` to be used when updating user profile. Same security level as above.
- `DELETE /userdata` to be used when deleting all user data (user details, seizure data and contact data). Same security level as above.
- `GET /contacts` to be used when retrieving an user's contacts. This endpoint is secured by a authentication function that checks if the user's access token and user ID provided in the `Authorization` header exist and are referring to the same user.
- `POST /contacts` to be used when adding a new contact for a specific user. Same security level as above.
- `PATCH /contacts` to be used when editing an existing contact for a specific user. Same security level as above, plus contact ID.
- `DELETE /contacts` to be used when editing an existing contact for a specific user. Same security level as above, plus contact ID.
- `GET /seizures` to be used when retrieving an user's seizures. This endpoint is secured by a authentication function that checks if the user's access token and user ID provided in the `Authorization` header exist and are referring to the same user.
- `POST /seizures` to be used when adding a new seizure for a specific user. Same security level as above.
- `PATCH /seizures` to be used when editing an existing seizure for a specific user. Same security level as above, plus seizure ID.
- `DELETE /seizures` to be used when editing an existing seizure for a specific user. Same security level as above, plus seizure ID.
- `GET /contacttypes` to be used when retrieving contact types and categories.
- `GET /seizuretypes` to be used when retrieving seizure types and descriptions.

All endpoints return customized error messages when validation fails.

## Tech used

- Node.js
- Express
- MongoDB
- Mongoose
- bcrypt
- CORS
- express-list-endpoints

On the frontend side of the project (see https://github.com/MindstormingAB/my-final-project-client-pwa for more information):
- Progressive Web Application (PWA)
- [Create React App](https://github.com/facebook/create-react-app)
- HTML5
- CSS3
- JavaScript ES6
- React
- Redux
- React Router
- Chart.js/react-chartjs-2
- Styled components
- Sweet Alert
- Moment

## View it live

This repository is located on https://github.com/MindstormingAB/my-final-project-server.
The API can be found on https://ep-app-api.herokuapp.com/.
You can take a look at the frontend on https://epilepsy-app.netlify.app/ or https://epilepsy-app-pwa.netlify.app/ for the Progressive Web App version.
You can find more information about the frontend on https://github.com/MindstormingAB/my-final-project-client or https://github.com/MindstormingAB/my-final-project-client-pwa. 
Enjoy!