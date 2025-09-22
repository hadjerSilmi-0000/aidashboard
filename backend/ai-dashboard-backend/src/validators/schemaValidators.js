import Joi from "joi";

// 1. Example CSV row schema validator (customize per dataset)
export const csvRowSchema = Joi.object({
    // Add your expected fields and types here
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    name: Joi.string().allow("").optional(),
    value: Joi.number().required(),
    timestamp: Joi.date().iso().optional(),
}).unknown(true); // allow other keys

// 2. Example JSON object schema validator
export const jsonItemSchema = Joi.object({
    // Example nested structure validation
    meta: Joi.object({
        source: Joi.string().optional(),
        receivedAt: Joi.date().iso().optional(),
    }).optional(),
    payload: Joi.object({
        id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        metrics: Joi.object().pattern(/.*/, Joi.number()).optional(),
    }).required(),
}).unknown(true);

// 3. Generic validator helper
export function validateWithSchema(schema, obj) {
    const { error, value } = schema.validate(obj, { abortEarly: false, convert: true });
    return { isValid: !error, errors: error ? error.details : [], value };
}
