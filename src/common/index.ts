import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';

const awsLambdaPowertoolsVersion = '1.5.1';

const defaultValues = {
    environment: process.env.ENVIRONMENT || 'N/A',
};

const logger = new Logger({
    persistentLogAttributes: {
        ...defaultValues,
        logger: {
            name: '@aws-lambda-powertools/logger',
            version: awsLambdaPowertoolsVersion,
        },
    },
});

const metrics = new Metrics({
    defaultDimensions: defaultValues,
    namespace: process.env.NAMESPACE,
    serviceName: process.env.SERVICE_NAME,
});

const tracer = new Tracer();

export { logger, metrics, tracer };
