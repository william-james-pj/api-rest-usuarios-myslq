const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

let secret = require("../config/secretJwt");

const UserModels = require("../models/User");
const PasswordToken = require("../models/PasswordToken");
class UsersController {
  async findAllUser(req, res) {
    let users = await UserModels.findAll();
    res.status(200);
    res.json(users);
  }

  async findUserId(req, res) {
    let user = await UserModels.findById(req.params.id);
    if (user === undefined) {
      res.status(400);
      res.json({});
    } else {
      res.status(200);
      res.json(user);
    }
  }

  async updateUser(req, res) {
    let { id, name, email, role } = req.body;
    let result = await UserModels.update(id, name, email, role);
    if (result === undefined)
      return res.status(500).send({ err: "Internal Server Error" });
    if (result.status === false)
      return res.status(406).send({ err: result.err });
      res.status(200);
    res.send("Updated user!");
  }

  async deleteUser(req, res) {
    let id = req.params.id;
    let result = await UserModels.delete(id);
    if (result.status === false)
      return res.status(406).send({ err: result.err });
      res.status(200);
    res.send("Deleted user!");
  }

  async createUser(req, res) {
    let erros = validationResult(req).formatWith(({ msg }) => msg);
    if (!erros.isEmpty()) {
      return res.status(400).send({ erros: erros.array() });
    }

    let { name, email, password, role } = req.body;

    let emailExists = await UserModels.findEmail(email);

    if (emailExists) {
      return res
        .status(406)
        .send({ erros: "The email is already registered!" });
    }

    await UserModels.new(name, email, password, role);

    res.status(200);
    res.send("Create user!");
  }

  async recoverPassword(req, res) {
    let email = req.body.email;
    console.log("aa " + email);
    let result = await PasswordToken.create(email);

    if (result === undefined) res.status(406).send({ err: result.err });

    res.status(200);
    res.send("" + result.token);
  }

  validate(method) {
    switch (method) {
      case "createUser": {
        return [
          body("name").exists().withMessage("Name doesn't exists"),
          body("email").exists().isEmail().withMessage("Invalid email"),
          body("password")
            .exists()
            .isLength({ min: 4 })
            .withMessage("Invalid password"),
          body("role")
            .optional()
            .isInt({ min: 0, max: 5 })
            .withMessage("Invalid role"),
        ];
      }
    }
  }

  async changePasword(req, res) {
    let { token, password } = req.body;

    let isTokenValid = await PasswordToken.validateToken(token);
    if (!isTokenValid.status)
      return res.status(406).send({ err: "Invalid token" });

    await UserModels.changePassword(
      password,
      isTokenValid.token.user_id,
      isTokenValid.token.token
    );
    res.status(200);
    res.send("Password changed");
  }

  async login(req, res) {
    let { email, password } = req.body;

    let user = await UserModels.findByEmail(email);

    if (user === undefined)
      return res.status(406).send({ err: "Invalid email" });

    let result = await bcrypt.compare(password, user.password);

    if (!result) return res.status(406).send({ err: "Invalid password" });

    var token = jwt.sign({ email, role: user.role }, secret);
    res.status(406);
    res.send("Login successfully");
  }
}

module.exports = new UsersController();
