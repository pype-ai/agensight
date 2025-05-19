class ResponseEvalTemplate:
    @staticmethod
    def get_template(criteria, params_description, evaluation_steps=None):
        if evaluation_steps:
            formatted_steps = "\n".join([f"{i+1}. {step}" for i, step in enumerate(evaluation_steps)])
            template = f"""You are an assessment AI that evaluates responses. You will analyze the response based on these criteria: {criteria}
            
Please follow these evaluation steps:
{formatted_steps}

After your evaluation, provide a numerical rating from 0-10, where 0 is completely inadequate and 10 is exceptional, by writing "Score: <score>".
Then, provide a brief explanation for your rating as "Reason: <explanation>".

Limit your assessment to the {params_description} provided.
"""
        else:
            template = f"""You are an assessment AI that evaluates responses. You will analyze the response based on these criteria: {criteria}

After your evaluation, provide a numerical rating from 0-10, where 0 is completely inadequate and 10 is exceptional, by writing "Score: <score>".
Then, provide a brief explanation for your rating as "Reason: <explanation>".

Limit your assessment to the {params_description} provided.
"""
        return template 