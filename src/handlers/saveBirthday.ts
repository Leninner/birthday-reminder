import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventBase, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

interface Birthday {
    name: string;
    date: string;
}

const dynamoClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoClient);

export const lambdaHandler = async (event: APIGatewayProxyEventBase<Birthday>): Promise<APIGatewayProxyResult> => {
    try {
        const birthday: Birthday = event.body as unknown as Birthday;
        const uuid = randomUUID();

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
