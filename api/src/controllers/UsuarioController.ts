import { Request, Response } from "express";
import { Usuario } from "../entities/Usuario";

import * as argon2 from "argon2";
import { dataSource } from "../db.config";
import { _token } from "../constants";

const jwt = require("jsonwebtoken");
const repo = dataSource.getRepository(Usuario);
require("dotenv").config();

export const createUser = async (req: Request, res: Response) => {
  const {
    imagenPerfil,
    nombre,
    paterno,
    materno,
    correo,
    password,
    telefono,
    rolId,
  } = req.body;

  const hashedPassword = await argon2.hash(password);
  try {
    const userInsert = await Usuario.save({
      imagenPerfil: imagenPerfil,
      nombre: nombre,
      paterno: paterno,
      materno: materno,
      correo: correo,
      telefono: telefono,
      password: hashedPassword,
      rolId: rolId,
    });

    if (userInsert) {
      let payload = {
        id: userInsert.id,
        correo: correo,
      };
      const token = jwt.sign(payload, process.env.TOKEN_SECRET);
      return res.status(200).send({ userInsert, token });
    }
  } catch (error) {
    return res
      .status(404)
      .json({ error: "Hubo un error al registrar al usuario." });
  }
};

export const login = async (req: Request, res: Response) => {
  const { correo, password } = req.body;
  const userFound = await repo
    .createQueryBuilder("user")
    .where("user.correo = :correo", { correo: correo })
    .leftJoinAndSelect("user.rol", "rol")
    .addSelect(["*"])
    .getOne();

  if (!userFound) {
    return res.status(404).json({ error: "Usuario no existe." });
  }

  const valid = await argon2.verify(userFound!.password, password);
  if (!valid) {
    return res.status(401).json({ message: "Contraseña incorrecta." });
  }

  let payload = { id: userFound.id, correo: userFound.correo };
  const token = jwt.sign(payload, _token);

  return res.status(200).header("auth-token", token).json({ userFound, token });
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userFound = await repo
    .createQueryBuilder("user")
    .where("user.id = :id", { id: Number(id) })
    .leftJoinAndSelect("user.rol", "rol")
    .addSelect(["*"])
    .getOne();

  if (userFound) return res.status(200).json(userFound);

  return res.status(404).json({ error: "Usuario no existe." });
};

export const getUserByRol = async (req: Request, res: Response) => {
  const { rol } = req.params;
  const usersFound = await Usuario.find({
    where: { rolId: Number(rol) },
  });

  if (usersFound && usersFound.length > 0)
    return res.status(200).json(usersFound);

  return res.status(404).json({ error: "No se encontraron coincidencias." });
};

export const getAllUsers = async (req: Request, res: Response) => {
  const usersFound = await repo
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.rol", "rol")
    .addSelect(["*"])
    .getMany();

  if (usersFound && usersFound.length > 0)
    return res.status(200).json(usersFound);

  return res.status(404).json({ error: "No se encontraron coincidencias." });
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    imagenPerfil,
    nombre,
    paterno,
    materno,
    correo,
    password,
    telefono,
    rolId,
  } = req.body;

  const userFound = await Usuario.findOneBy({
    id: Number(id),
  });

  if (!userFound) return res.status(404).json({ error: "Usuario no existe." });

  const hashedPassword = await argon2.hash(password);

  const userUpdated = await Usuario.update(
    { id: userFound.id },
    {
      imagenPerfil: imagenPerfil,
      nombre: nombre,
      paterno: paterno,
      materno: materno,
      correo: correo,
      telefono: telefono,
      password: password !== "" ? hashedPassword : userFound.password,
      rolId: rolId,
    }
  );

  if (userUpdated.affected == 0)
    return res.status(404).json({ error: "Hubo un error al actualizar." });

  return res
    .status(200)
    .json({ message: "Usuario actualizado correctamente." });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userFound = await Usuario.findOneBy({
    id: Number(id),
  });

  if (userFound) {
    const userDeleted = await Usuario.delete({
      id: Number(id),
    });

    if (userDeleted.affected == 0)
      return res.status(404).json({ error: "Hubo un error al eliminar." });

    return res
      .status(200)
      .json({ message: "Usuario eliminado correctamente." });
  }

  return res.send({ error: "No existe el usuario." });
};
