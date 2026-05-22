UPDATE `users`
SET
  `approvalStatus` = 'approved',
  `approvedAt` = COALESCE(`approvedAt`, NOW())
WHERE `approvalStatus` <> 'approved';
