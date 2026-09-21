`timescale 1ns/1ps
module tb;
reg clk=0; always #5 clk=~clk;
initial begin #2000000; $fatal(1, "GLOBAL_TIMEOUT"); end
reg [127:0] keys[0:15], plains[0:15], expected[0:15];
initial begin
keys[0]=128'h000102030405060708090a0b0c0d0e0f; plains[0]=128'h00112233445566778899aabbccddeeff; expected[0]=128'h69c4e0d86a7b0430d8cdb78070b4c55a;
keys[1]=128'h2b7e151628aed2a6abf7158809cf4f3c; plains[1]=128'h3243f6a8885a308d313198a2e0370734; expected[1]=128'h3925841d02dc09fbdc118597196a0b32;
keys[2]=128'h00000000000000000000000000000000; plains[2]=128'h00000000000000000000000000000000; expected[2]=128'h66e94bd4ef8a2c3b884cfa59ca342b2e;
keys[3]=128'h8a87a4b07967f829fe88bc456bd0dfec; plains[3]=128'h657291374d4b0aa82d44978f9fa54937; expected[3]=128'h0f45136ba1697655e8d33a720949463b;
keys[4]=128'hbb34019cd0a9aada0363acc328a6d84c; plains[4]=128'ha11ef143dd82c6197f0acd09d5e68745; expected[4]=128'h49c8b710b4d6ef4db472edc0aca8c6fa;
keys[5]=128'ha0f6cbfae295403fd035afd87fe2cf80; plains[5]=128'hf7857dcfa185cbeb50ba5b92c7ec3b11; expected[5]=128'h328a0caad5a1cf76c131be13e100428a;
keys[6]=128'hb52ca34c63e0bbb6e4fe1c4fccbb1afc; plains[6]=128'he61e932dc6dad2f51eea54902efc3247; expected[6]=128'heafbb9b52d17db76489eab95737f82d0;
keys[7]=128'hf710d8ce9754666e0b88df4282067ab5; plains[7]=128'h50d639451cd2dbd230a1ca785830b312; expected[7]=128'h1676e51ff41b409f09ba276e912cd889;
keys[8]=128'h025054652d4f9628289bf960ec48d61f; plains[8]=128'hb1cd68961b30d85ae26f6fa7465b4656; expected[8]=128'he25b36b71ffc99162faabbe077f9fa2f;
keys[9]=128'hfbe6518c762f6e507c1556d8eec7bc9b; plains[9]=128'hf33683adde221a28ac28eac063df70e7; expected[9]=128'h90fe21f8fb111f0507263a252e3ed821;
keys[10]=128'h9c8a6d056cccf1c2acf36311e54a114d; plains[10]=128'he03f186f9ad65768f9c5563b5ad58bda; expected[10]=128'h41940c910af5c005afc2f12a157936de;
keys[11]=128'h46d56d7880adf74e954b2b22e928897e; plains[11]=128'h7b7b9a9b6e89fd8a32b0b83df1a92bb5; expected[11]=128'haccb66806f74bf53e677f99dd6a36bfd;
keys[12]=128'ha1683e369c34a32bd54aa2ebfacc5d6d; plains[12]=128'hc0a11596484b49cbdcc81873062b0fbe; expected[12]=128'h1ba63b30f8642777cbda9c55a1a3bef9;
keys[13]=128'hc4f9422b89c845417d355c9269f2ff4e; plains[13]=128'hfe9c05a016b21081b4340c7d5745eee9; expected[13]=128'h1298ae31cf3ba765e0144b63072ad5c1;
keys[14]=128'h319a697b84532aea1353fc1bdb40d06b; plains[14]=128'hf09cb8f7e95be28816ef0c5aedc62d99; expected[14]=128'ha1a483303202dd9d76923e174412bf5b;
keys[15]=128'he9025dd38c47ba40e9a6ec14ef6e3310; plains[15]=128'h0e18801ca46dca7bfdf909f3ab855f0f; expected[15]=128'h5e8691a2349486da5fd00da8fc00ce44;
end

reg[127:0] key=0,state=0; wire[127:0] out;
aes_128 dut(.clk(clk),.state(state),.key(key),.out(out));
integer cycle=0,checked=0;
// Upstream aes_128 has a 21-edge pipeline and no reset/valid port.
initial begin
 @(negedge clk);
 for(cycle=0;cycle<37;cycle=cycle+1) begin
  if(cycle<16) begin key=keys[cycle]; state=plains[cycle]; end
  else begin key=0; state=0; end
  @(posedge clk); #2;
  if(cycle>=20 && cycle<36) begin
   if(out!==expected[cycle-20]) $fatal(1,"AES_DATA %0d expected=%h got=%h",cycle-20,expected[cycle-20],out);
   checked=checked+1;
  end
  @(negedge clk);
 end
 if(checked!=16) $fatal(1,"AES_COUNT");
 $display("IP_PREPARATION_PASS tiny-aes checks=16"); $finish;
end
endmodule
