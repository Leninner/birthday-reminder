import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger, metrics, tracer } from '../common';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import middy from '@middy/core';

const dynamoClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoClient);

export const lambdaHandler = async (): Promise<void> => {
    try {
        const params = {
            TableName: 'birthdays',
            KeyConditionExpression: 'date LIKE :date',
            ExpressionAttributeValues: {
                ':date': { S: '2021-10-10' },
            },
        };

        const rawBirthdays = (await documentClient.send(new QueryCommand(params))).Items;

        const birthdays = rawBirthdays?.map((birthday) => unmarshall(birthday));

        logger.info('[Birthday Reminder] Birthdays', {
            details: { birthdays },
        });
    } catch (err) {
        console.log(err);
    }
};

export const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(injectLambdaContext(logger));
