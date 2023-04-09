import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventBase, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { logger, metrics, tracer } from '../common';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';

import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import httpErrorHandler from '@middy/http-error-handler';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import { transpileSchema } from '@middy/validator/transpile';

interface Birthday {
    name: string;
    date: string;
}

const dynamoClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoClient);

export const lambdaHandler = async (event: APIGatewayProxyEventBase<Birthday>): Promise<APIGatewayProxyResult> => {
    logger.info('[POST birthday] Lambda invoked', {
        details: { event },
    });
    tracer.putAnnotation('awsRequestId', event.requestContext.requestId);

    try {
        const birthday: Birthday = event.body as unknown as Birthday;
        const uuid = randomUUID();

        logger.appendKeys({ uuid });
        tracer.putAnnotation('uuid', uuid);
        metrics.addMetadata('uuid', uuid);

        const params = {
            Item: {
                ...birthday,
                id: uuid,
                created: Date.now(),
            },
            TableName: 'birthdays',
        };

        await documentClient.send(new PutCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Congrats! Your birthday was saved!',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};

const inputSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                date: { type: 'string' },
            },
            required: ['name', 'date'],
            additionalProperties: false,
        },
    },
};

export const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(injectLambdaContext(logger))
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(
        validator({
            eventSchema: transpileSchema(inputSchema),
        }),
    )
    .use(httpErrorHandler());
