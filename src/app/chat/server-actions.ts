"use server";

const ACCESS_KEY = process.env.ACCESS_KEY;

if (!ACCESS_KEY) {
  throw new Error("ACCESS_KEY is not set.");
}

export const checkAuth = async (accessKey: string) => {
  return accessKey === ACCESS_KEY;
};
