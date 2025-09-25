import Joi from "joi";

// CSV row schema validator (example, customize per dataset)
export const csvRowSchema = Joi.object({
    // id must be string or number, required
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),

    // name is optional, can be empty string
    name: Joi.string().allow("").optional(),

    // value must be a number, required
    value: Joi.number().required(),

    // timestamp is optional, must be valid ISO date if present
    timestamp: Joi.date().iso().optional(),
}).unknown(true); // allow extra fields not defined in the schema

// JSON item schema validator (example with nested structure)
export const jsonItemSchema = Joi.object({
    // meta object is optional
    meta: Joi.object({
        source: Joi.string().optional(),
        receivedAt: Joi.date().iso().optional(),
    }).optional(),

    // payload object is required
    payload: Joi.object({
        // id must be string or number, required
        id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),

        // metrics can have dynamic keys, each must map to a number
        metrics: Joi.object().pattern(/.*/, Joi.number()).optional(),
    }).required(),
}).unknown(true); // allow extra fields not defined in the schema

// Generic validator helper
export function validateWithSchema(schema, obj) {
    // validate object against schema
    const { error, value } = schema.validate(obj, {
        abortEarly: false,
        convert: true,
    });

    return {
        isValid: !error,
        errors: error ? error.details : [],
        value,
    };
}
