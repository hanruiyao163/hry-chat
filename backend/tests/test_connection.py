from ast import main
from pandas import api
import boto3
import os
import psycopg
from pymilvus import MilvusClient
from app.core.config import Settings


def test_connection_s3(settings):
    # 创建S3客户端（指向R2）
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.ENDPOINT_URL,
        aws_access_key_id=settings.ACCESS_KEY_ID,
        aws_secret_access_key=settings.SECRET_ACCESS_KEY,
    )

    response = s3.list_objects_v2(Bucket=settings.BUCKET_NAME, Prefix="")
    if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
        print("S3连接成功")
    else:
        raise Exception("S3连接失败")


def test_connection_postgres(settings):
    try:
        with psycopg.connect(settings.POSTGRES_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
            print("postgres连接成功")
    except Exception:
        raise Exception("postgres连接失败")


def test_connection_milvus(settings):
    client = MilvusClient(uri=settings.ZILLIZ_URI, token=settings.ZILLIZ_TOKEN)
    client.list_collections()
    print("milvus连接成功")


def test_connection_llm(settings: Settings):
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI

    embeddings = OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL, base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY
    )
    llm = ChatOpenAI(model=settings.CHAT_MODEL, base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY)
    embeddings.embed_query("你好")
    llm.invoke("你好")

    print("llm连接成功")
