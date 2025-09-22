import Joi from "joi";

// ----- Base schemas -----
const email = Joi.string().email().max(255).required().messages({
    "string.email": "Please provide a valid email address",
    "string.max": "Email must be less than 255 characters",
});

const password = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
        "string.pattern.base":
            "Password must contain uppercase, lowercase, number and special char",
    });

const name = Joi.string().min(2).max(50).required();

// ----- Schemas -----
export const authSchemas = {
    register: Joi.object({
        email,
        password,
        confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
            "any.only": "Password confirmation does not match",
        }),
        name,
    }),

    login: Joi.object({
        email,
        password: Joi.string().required(),
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        password,
        confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    }),

    updateProfile: Joi.object({
        name: name.optional(),
    }),
};

// ----- Middleware -----
export const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: error.details.map((d) => ({
                field: d.path.join("."),
                message: d.message,
            })),
        });
    }

    req.body = value;
    next();
};
