import { DataSource } from "typeorm";
import * as argon2 from "argon2";

import {
  _dbHost,
  _dbName,
  _dbPassword,
  _dbPort,
  _dbSync,
  _dbUser,
  _isProd,
  _token,
} from "./constants";
import { Rol } from "./entities/Rol";
import { Usuario } from "./entities/Usuario";
import { Variable } from "./entities/Variable";
import { Planta } from "./entities/Planta";

const jwt = require("jsonwebtoken");

export const dataSource = new DataSource({
  type: "postgres",
  username: _dbUser,
  password: _dbPassword,
  port: Number(_dbPort),
  host: _dbHost,
  database: _dbName,
  entities: [Rol, Usuario, Variable, Planta],
  synchronize: _dbSync,
  ssl: !_isProd,
});

const insertarAdmin = async () => {
  const adminFound = await Usuario.findOne({
    where: { correo: "raanloga@gmail.com" },
  });

  if (adminFound) return;

  const resultRol = await Rol.save({
    nombre: "Administrador",
    descripcion: "Superusuario con todos los permisos",
  });

  const hashedPassword = await argon2.hash("t3mpor4l");
  try {
    const userInsert = await Usuario.save({
      imagenPerfil:
        "https://i.pinimg.com/originals/19/93/c3/1993c392d24666e1d18fe842d7eb666b.jpg",
      nombre: "Rafael Antonio",
      paterno: "Lopez",
      materno: "Garcia",
      correo: "raanloga@gmail.com",
      password: hashedPassword,
      telefono: "9514268601",
      rolId: resultRol.id,
    });

    if (userInsert) {
      let payload = {
        id: userInsert.id,
        correo: "raanloga@gmail.com",
      };
      jwt.sign(payload, _token);
    }
  } catch (error) {
    console.log(error);
  }
};

export const connectDB = async () => {
  dataSource
    .initialize()
    .then(() => {
      console.log("Conectado a la base de datos");
      insertarAdmin().then(() => {
        console.log("Administrador creado");
      });
    })
    .catch((err: any) => {
      console.error(err);
    });
};
