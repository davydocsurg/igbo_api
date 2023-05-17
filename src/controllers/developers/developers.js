import { hash } from 'bcrypt';
import { v4 as uuid } from 'uuid';
<<<<<<<< HEAD:src/controllers/developers.ts
import { isProduction, CLIENT_TEST, isTest } from '../config';
import { developerSchema } from '../models/Developer';
import { createDbConnection, handleCloseConnection } from '../services/database';
import { Express } from '../types';
import { sendNewDeveloper } from './email';
========
import { isProduction, CLIENT_TEST, isTest } from '../../config';
import { developerSchema } from '../../models/Developer';
import { createDbConnection, handleCloseConnection } from '../../services/database';
import { sendNewDeveloper } from '../email';
>>>>>>>> 53662e8 (chore: move developers controller method to developers folder #627):src/controllers/developers/developers.js

const TEST_EMAIL = 'developer@example.com';

/* Creates a new apiKey to be associated with a developer */
const generateApiKey = uuid;

/* Creates a new Developer in the database */
export const postDeveloper: Express.MiddleWare = async (req, res, next) => {
  const connection = createDbConnection();
  const Developer = connection.model('Developer', developerSchema);

  try {
    const { body: data } = req;
    const { email, password, name } = data;

    const developers = await Developer.find({ email });
    if (developers.length && email !== TEST_EMAIL) {
      throw new Error('This email is already used.');
    }

    if ((isProduction || CLIENT_TEST) && email === TEST_EMAIL) {
      throw new Error('This email is already used.');
    }

    const apiKey = generateApiKey();
    const hashedPassword = await hash(password, 10);
    const developer = new Developer({
      name,
      email,
      apiKey,
      password: hashedPassword,
    });
    await developer.save();
    if (!isTest) {
      try {
        await sendNewDeveloper({ to: email, apiKey, name });
      } catch (err) {
        console.log(err.response.body.errors);
      }
    }
    await handleCloseConnection(connection);
    return res.send({
      message: `Success email sent to ${email}`,
      apiKey,
    });
  } catch (err) {
    await handleCloseConnection(connection);
    if (!isTest) {
      console.trace(err);
    }
    return next(err);
  }
};

export const getDeveloper = async (req, res, next) => {
  const connection = createDbConnection();
  const Developer = connection.model('Developer', developerSchema);
  const { id } = req.params;
  try {
    const developer = await Developer.findById(id);

    if (!developer) {
      throw new Error("Developer doesn't exist");
    }

    await handleCloseConnection(connection);
    return res.status.send({
      message: 'Success',
      developer,
    });
  } catch (err) {
    await handleCloseConnection(connection);
    if (!isTest) {
      console.trace(err);
    }
    return next(err);
  }
};
